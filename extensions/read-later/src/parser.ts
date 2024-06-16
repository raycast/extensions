
export function parse(input: string): { title: string, url: string }[] {
    const links: { title: string, url: string }[] = [];
    const regex = /\[(.*?)\]\((.*?)\)/g;

    let match;
    while ((match = regex.exec(input)) !== null) {
        const title = match[1];
        const url = match[2];
        links.push({ title, url });
    }

    return links;
}

// code that references the 'parse' method
