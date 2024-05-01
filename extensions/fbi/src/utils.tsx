import { Icon, List } from "@raycast/api";
import { ArtCrime, WantedPerson } from "./types";

export function ItemWithTextOrIcon ({ title, text: item }: { title: string, text: string | undefined }) {
    const text = item || undefined;
    const icon = item ? undefined : Icon.Minus;
    return <List.Item.Detail.Metadata.Label title={title} text={text} icon={icon} />
}

export function generateMarkdown(artcrime: ArtCrime | WantedPerson) {
    let img = "";
    if (artcrime.images.length) {
        const image = artcrime.images[0];
        const alt = image.caption || artcrime.title;
        const src = image.original || image.large || image.thumb;
        img = `![${alt}](${src})`;
    }
    return img + `\n\n ${artcrime.description}`;
}