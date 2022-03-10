const content = `
### Before Using
You need use **homebrew** install \`SPEEDTEST CLI\`
\`\`\`shell
brew tap teamookla/speedtest
brew update
# Example how to remove conflicting or old versions using brew
# brew uninstall speedtest --force
brew install speedtest --force
\`\`\`
`
export default function () {
  return content
}
