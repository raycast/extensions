import { refreshPages } from "./tldr";

export default async function main(): Promise<void> {
    await refreshPages()
}
