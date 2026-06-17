//
//  SvgaPlaygroundView.swift
//
//
//  Created by Nerd Just on 2024/12/17.
//

import Cocoa
import WebKit

class SvgaPlaygroundView: NSView {
    
    lazy var webView = {
        let webView = WKWebView()
        webView.translatesAutoresizingMaskIntoConstraints = false
        return webView
    }()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupUI()
        loadWebView()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        wantsLayer = true
        
        addSubview(webView)
        webView.frame = bounds
    }

    private func loadWebView() {

        guard let resourceUrlString = (NSApplication.shared.delegate as! AppDelegate).resourceUrlString else {
            fatalError("resource url is nil!")
        }
        
        guard let bundlePath = Bundle.main.executablePath else {
            fatalError("Bundle path is not exist!")
        }
        
        let bundleURL = URL(fileURLWithPath: bundlePath)
        let htmlFilePath = bundleURL.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("index.html")
        if let resourceURL = URL(string: resourceUrlString) {
            var replaceContent = resourceUrlString
            if resourceURL.isFileURL {
                guard let svgaData = try? Data(contentsOf: resourceURL) else {
                    fatalError("Can not read file content!")
                }
                let base64String = svgaData.base64EncodedString()
                replaceContent = "data:svga/2.0;base64," + base64String
            }
            do {
                var htmlContent = try String(contentsOf: htmlFilePath, encoding: .utf8)
                htmlContent = htmlContent.replacingOccurrences(of: "___svga_src___", with: replaceContent)
                webView.loadHTMLString(htmlContent, baseURL: nil)
            } catch {
                fatalError("Error reading HTML file: \(error). Looked for file at: \(htmlFilePath.path)")
            }
        }
    }
}
