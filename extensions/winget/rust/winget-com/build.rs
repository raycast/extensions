fn main() {
    println!("cargo:rerun-if-changed=metadata/Microsoft.Management.Deployment.winmd");
    // Returns warnings and panics on a bad winmd, so there is no error to check.
    let _ = windows_bindgen::bindgen([
        "--in",
        "metadata/Microsoft.Management.Deployment.winmd",
        "default",
        "--out",
        "src/bindings.rs",
        "--filter",
        "Microsoft.Management.Deployment",
    ]);
}
