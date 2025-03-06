export function ipfsLinkToHttpLink(link: string) {
  return link?.replace("ipfs://", "https://w3s.link/ipfs/");
}

export function ipfsTextToHttpText(text: string) {
  return text?.replace(/ipfs:\/\/([a-zA-Z0-9]+)/g, "https://w3s.link/ipfs/$1");
}
