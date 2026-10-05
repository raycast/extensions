export function configureNativeBenchmarkEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
  // Raycast's Swift build is coverage-instrumented. The extension does not collect coverage at runtime,
  // and its default working directory can be read-only, so discard the unused profile output.
  environment.LLVM_PROFILE_FILE = "/dev/null";
}
