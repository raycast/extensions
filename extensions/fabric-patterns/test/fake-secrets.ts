// A fake Anthropic key for the redaction and secrets-file tests. Joined at runtime so no literal in the
// source matches a secret scanner's `sk-ant-…` signature (the public-repo push gate), while the value
// the tests use stays key-shaped.
export const FAKE_ANTHROPIC_KEY = ["sk", "ant", "api03", "AbCdEf123456"].join("-");
