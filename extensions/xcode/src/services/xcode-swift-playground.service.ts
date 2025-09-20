import { XcodeSwiftPlaygroundCreationParameters } from "../models/swift-playground/xcode-swift-playground-creation-parameters.model";
import { XcodeSwiftPlayground } from "../models/swift-playground/xcode-swift-playground.model";
import { XcodeSwiftPlaygroundPlatform } from "../models/swift-playground/xcode-swift-playground-platform.model";
import { execAsync } from "../shared/exec-async";
import dedent from "dedent";
import { XcodeSwiftPlaygroundTemplate } from "../models/swift-playground/xcode-swift-playground-template.model";
import { existsAsync, makeDirectoryAsync, removeDirectoryAsync, writeFileAsync } from "../shared/fs-async";
import untildify from "untildify";
import * as Path from "path";
import { createSwiftPlaygroundCommandPreferences } from "../shared/preferences";
import { XcodeSwiftPlaygroundSwiftVersion } from "../models/swift-playground/xcode-swift-playground-swift-version.model";

/**
 * XcodeSwiftPlaygroundService
 */
export class XcodeSwiftPlaygroundService {
  /**
   * The scaffold Swift Playground TemplateFiles
   */
  private static scaffoldTemplateFiles: TemplateFile[] = [
    {
      path: "playground.xcworkspace",
      name: "contents",
      extension: "xcworkspacedata",
      contents: `
      <?xml version="1.0" encoding="UTF-8"?>
      <Workspace version="1.0">
        <FileRef location="group:">
        </FileRef>
      </Workspace>
      `,
    },
  ];

  /**
   * The default location where a Swift Playground should be created
   */
  static get defaultSwiftPlaygroundLocation(): string {
    return createSwiftPlaygroundCommandPreferences.playgroundDefaultLocation;
  }

  /**
   * Create a new Swift Playground
   * @param parameters The XcodeSwiftPlaygroundCreationParameters
   * @param forceCreate Bool value if the creation of a Swift Playground should be enforced
   */
  static async createSwiftPlayground(
    parameters: XcodeSwiftPlaygroundCreationParameters,
    forceCreate: boolean
  ): Promise<XcodeSwiftPlayground> {
    const playgroundPath = await XcodeSwiftPlaygroundService.makeSwiftPlaygroundPath(
      parameters.location,
      parameters.name,
      forceCreate
    );
    if (!forceCreate && (await existsAsync(playgroundPath))) {
      return {
        name: parameters.name,
        path: playgroundPath,
        alreadyExists: true,
        open: () => {
          return execAsync(`open ${playgroundPath}`).then();
        },
      };
    }
    // Make playground directory
    await makeDirectoryAsync(playgroundPath);
    // Initialize template files
    const templateFiles = [
      ...XcodeSwiftPlaygroundService.scaffoldTemplateFiles,
      XcodeSwiftPlaygroundService.swiftSourceContentsTemplateFile(parameters.template),
      XcodeSwiftPlaygroundService.contentsTemplateFile(parameters.platform, parameters.swiftVersion),
    ];
    try {
      // Create TemplateFiles in parallel
      await Promise.all(
        templateFiles.map(async (templateFile) => {
          // Initialize file path with current playground path
          let filePath = playgroundPath;
          // Check if template file has a path
          if (templateFile.path) {
            // Join current file path with template file path
            filePath = Path.join(filePath, templateFile.path);
            // Make directory
            await makeDirectoryAsync(filePath);
          }
          // Join current file path with file name
          filePath = Path.join(filePath, [templateFile.name, templateFile.extension].join("."));
          // Write file
          await writeFileAsync(filePath, dedent(templateFile.contents));
        })
      );
    } catch (error) {
      try {
        // On error perform rollback
        // Try to remove the playground directory
        await removeDirectoryAsync(playgroundPath, { recursive: true });
      } catch (error) {
        // Log and ignore this error
        // As we only try to clean up the Playground directory
        // in case of an error
        console.error(error);
      }
      // Re-Throw Error
      throw error;
    }
    // Return Playground
    return {
      name: parameters.name,
      path: playgroundPath,
      alreadyExists: false,
      open: () => {
        return execAsync(`open ${playgroundPath}`).then();
      },
    };
  }

  /**
   * Make a Swift Playground path for a given location and file name
   * @param location location in which we want to save the playground file.
   * @param filename filename of the created or opened playground file.
   * @param forceCreate define if we want to force create or not.
   */
  private static async makeSwiftPlaygroundPath(
    location: string,
    filename: string,
    forceCreate: boolean
  ): Promise<string> {
    let path = "";
    let iteration = null;
    const targetLocation = untildify(location);
    do {
      const dateString = new Date().toLocaleDateString().replaceAll("/", "-").replaceAll(".", "-");
      const name =
        iteration == null
          ? `${filename}-${dateString}.playground`
          : `${filename}-${dateString}-${iteration}.playground`;
      path = Path.join(targetLocation, name);
      iteration = iteration == null ? 1 : iteration + 1;
    } while ((await existsAsync(path)) && forceCreate);
    return path;
  }

  /**
   * The XCPlayground contents TemplateFile
   * @param platform The XcodeSwiftPlaygroundPlatform
   * @param swiftVersion The XcodeSwiftPlaygroundSwiftVersion
   * @private
   */
  private static contentsTemplateFile(
    platform: XcodeSwiftPlaygroundPlatform,
    swiftVersion: XcodeSwiftPlaygroundSwiftVersion
  ): TemplateFile {
    return {
      name: "contents",
      extension: "xcplayground",
      contents: `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <playground version='7.0' 
                  target-platform='${platform.toLowerCase()}' 
                  swift-version='${swiftVersion}'
                  buildActiveScheme='true' 
                  executeOnSourceChanges='false' 
                  importAppTypes='true'>
      </playground>
      `,
    };
  }

  /**
   * Swift Source Contents TemplateFile
   * @param template The XcodeSwiftPlaygroundTemplate
   */
  private static swiftSourceContentsTemplateFile(template: XcodeSwiftPlaygroundTemplate): TemplateFile {
    let contents: string;
    switch (template) {
      case XcodeSwiftPlaygroundTemplate.Empty:
        contents = "import Foundation\n\n";
        break;
      case XcodeSwiftPlaygroundTemplate.SwiftUI:
        contents = `
        import PlaygroundSupport
        import SwiftUI
        
        struct ContentView: View {
        
            var body: some View {
                Text("Hello World")
            }
            
        }
        
        PlaygroundPage.current.liveView = UIHostingController(rootView: ContentView())
        `;
        break;
      case XcodeSwiftPlaygroundTemplate.UIKit:
        contents = `
        import Foundation
        import PlaygroundSupport
        import UIKit

        class ViewController : UIViewController {
          override func viewDidLoad() {
            super.viewDidLoad()
          }
        }

        let viewController = ViewController()
        viewController.view.frame = CGRect(x: 0, y: 0, width: 300, height: 600)
        PlaygroundPage.current.liveView = viewController
        PlaygroundPage.current.needsIndefiniteExecution = true
        `;
        break;
    }
    return {
      name: "Contents",
      extension: "swift",
      contents: contents,
    };
  }
}

/**
 * A Template File
 */
interface TemplateFile {
  /**
   * The optional path
   */
  path?: string;
  /**
   * The name of the file
   */
  name: string;
  /**
   * The file extension
   */
  extension: string;
  /**
   * The file contents
   */
  contents: string;
}
