import { DependencyList, EffectCallback, useEffect, useState } from "react";
import { XcodeSwiftPackageMetadata } from "../../models/swift-package/xcode-swift-package-metadata.model";
import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { XcodeAddSwiftPackage } from "./xcode-add-swift-package.component";

/**
 * Xcode add Swift Package Form
 */
export function XcodeAddSwiftPackageForm() {
  // Use navigation
  const navigation = useNavigation();
  // Use Swift Package Url State
  const [swiftPackageUrl, setSwiftPackageUrl] = useState("");
  // Use Swift Package Url State
  const [swiftPackageMetadata, setSwiftPackageMetadata] = useState<XcodeSwiftPackageMetadata | undefined>(undefined);
  // Use Effect to read current Clipboard contents once
  useEffect(() => {
    // Retrieve Swift Package Url from Clipboard
    Clipboard.readText()
      .then((contents) => {
        // Check if clipboard contents is a valid Swift Package Url
        if (contents && XcodeSwiftPackageService.isSwiftPackageUrlValid(contents)) {
          // Return contents
          return contents;
        } else {
          // Otherwise, return null
          return null;
        }
      })
      // Replace error with null
      .catch(() => null)
      .then((url) => {
        // Check if an url is available
        if (url) {
          // Set Swift Package url
          setSwiftPackageUrl(url);
        }
      });
  }, []);
  // Use effect to load Swift Package Metadata
  useDebouncedEffect(
    () => {
      // Clear current Swift Package Metadata
      setSwiftPackageMetadata(undefined);
      // Retrieve Swift Package Metadata from Swift Package Url
      XcodeSwiftPackageService.getSwiftPackageMetadata(swiftPackageUrl)
        .catch(() => null)
        .then((metadata) => setSwiftPackageMetadata(metadata ?? undefined));
    },
    [swiftPackageUrl],
    500
  );
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Swift Package"
            onSubmit={async () => {
              if (!XcodeSwiftPackageService.isSwiftPackageUrlValid(swiftPackageUrl)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Please enter a valid url to a Swift Package",
                });
              }
              navigation.push(<XcodeAddSwiftPackage url={swiftPackageUrl} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="Swift Package URL" value={swiftPackageUrl} onChange={setSwiftPackageUrl} />
      {swiftPackageMetadata?.name ? <Form.Description title="Name" text={swiftPackageMetadata.name} /> : null}
      {swiftPackageMetadata?.description ? (
        <Form.Description title="Description" text={swiftPackageMetadata.description} />
      ) : null}
      {swiftPackageMetadata?.starsCount ? (
        <Form.Description title="Stars" text={swiftPackageMetadata.starsCount.toString()} />
      ) : null}
      {swiftPackageMetadata?.license ? <Form.Description title="Name" text={swiftPackageMetadata.license} /> : null}
    </Form>
  );
}

/**
 * Use debounced effect
 * @param effect The EffectCallback
 * @param deps The DependencyList
 * @param delay The delay
 */
const useDebouncedEffect = (effect: EffectCallback, deps: DependencyList | undefined, delay: number) => {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
  }, [...(deps || []), delay]);
};
