import { Detail } from "@raycast/api";

const markdown = `
# Påfyll office address

Torggata 8, 0181 Oslo
`

export default function Command() {
  return <Detail markdown={markdown} />;
}
