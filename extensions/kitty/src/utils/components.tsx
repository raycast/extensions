import { Detail } from "@raycast/api";

const SETUP_MARKDOWN = `
# Kitty Remote Control Not Available

To use this extension, you need to enable Kitty's remote control via a Unix socket.

## Setup Instructions

Add the following lines to your Kitty configuration file (\`~/.config/kitty/kitty.conf\`):

\`\`\`
allow_remote_control socket-only
listen_on unix:/tmp/kitty-socket-{kitty_pid}
\`\`\`

Then **restart Kitty** for the changes to take effect.

## Verify

After restarting, check that the socket exists:

\`\`\`bash
ls -la /tmp/kitty-socket-*
\`\`\`

And test remote control:

\`\`\`bash
kitten @ --to unix:/tmp/kitty-socket-$(pgrep -x kitty) ls
\`\`\`

## Custom Socket Path

The extension auto-detects sockets matching \`/tmp/kitty-socket-*\`. If you use a different path, set it in the **Socket Path** preference.
`;

export function SetupGuide() {
  return <Detail markdown={SETUP_MARKDOWN} />;
}
