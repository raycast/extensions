import test from "node:test";
import { readAsset, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

for (const engine of ["chromium", "webkit"]) {
  test(`${engine} builds nested tab queries using the Apple Event absolute-position protocol`, () => {
    const source = readAsset(`${engine}-ax.swift`);
    runSwiftHarness(`
      import AppKit
      import Carbon
      ${swiftFunction(source, "fourCC")}
      ${swiftFunction(source, "everyElement")}
      ${swiftFunction(source, "propertySpec")}
      let windows = everyElement(want: fourCC("cwin"), from: NSAppleEventDescriptor.null())
      let tabs = everyElement(want: fourCC("CrTb"), from: windows)
      let query = propertySpec(prop: fourCC("URL "), from: tabs)
      let property = query.coerce(toDescriptorType: typeAERecord)!
      precondition(property.forKeyword(UInt32(keyAEKeyForm))?.enumCodeValue == UInt32(formPropertyID))
      let tabSpec = property.forKeyword(UInt32(keyAEContainer))!.coerce(toDescriptorType: typeAERecord)!
      let winSpec = tabSpec.forKeyword(UInt32(keyAEContainer))!.coerce(toDescriptorType: typeAERecord)!
      for spec in [tabSpec, winSpec] {
        precondition(spec.forKeyword(UInt32(keyAEKeyForm))?.enumCodeValue == UInt32(formAbsolutePosition),
          "Chrome rejects the query with -1700 when the selection form is a descriptor type")
        let selector = spec.forKeyword(UInt32(keyAEKeyData))!
        precondition(selector.descriptorType == typeAbsoluteOrdinal)
        var ordinal: UInt32 = 0
        _ = withUnsafeMutableBytes(of: &ordinal) { selector.data.copyBytes(to: $0) }
        precondition(ordinal == UInt32(kAEAll))
      }
    `);
  });
}
