import { Collection } from "./types";

export function getEntityIcon(entity: { entity_type: string } | Collection) {
    let iconName = "";
    if (entity.entity_type === "actor.member") {
        iconName = "PEOPLE";
    } else if (entity.entity_type === "curation.article") {
        iconName = "ARTICLES";
    } else if (entity.entity_type === "curation.audio") {
        iconName = "LISTEN";
    } else if (entity.entity_type === "curation.tweet") {
        iconName = "TWEETS";
    } else if (entity.entity_type === "curation.video") {
        iconName = "VIDEOS";
    } else if (entity.entity_type === "curation.image" || entity.entity_type === "contribution.highlighted_image") {
        iconName = "PICTURES";
    } else if (entity.entity_type === "curation.text") {
        iconName = "TEXTS";
    } else if (entity.entity_type === "curation.book") {
        iconName = "BOOKS";
    } else if (entity.entity_type === "curation.link") {
        iconName = "LINK";
    } else if (entity.entity_type === "curation.file") {
        iconName = "FILES";
    } else if (entity.entity_type === "collection.collection" || entity.entity_type === "collection.import") {
        iconName = getCollectionIconName(entity as Collection);
    } else if (entity.entity_type === "contribution.highlight") {
        iconName = "HIGHLIGHTS";
    } else if (entity.entity_type === "contribution.note") {
        iconName = "NOTES";
    }

    return getIconPath(iconName);
}

export function getCollectionIcon(collection: Collection) {
    const iconName = getCollectionIconName(collection);
    return getIconPath(iconName);
}

function getCollectionIconName(collection: Collection) {
    let iconName = "SEMI-OPEN";
    if (collection.privacy === "private" && collection.has_collaborators) {
        iconName = "COLLABORATIVE-PRIVATE";
    } else if (collection.privacy === "private") {
        iconName = "PRIVATE";
    } else if (collection.privacy === "public") {
        iconName = "COMMUNAL";
    } else if (collection.has_collaborators) {
        iconName = "COLLABORATIVE";
    }

    return iconName;
}

export function getIconPath(iconName: string) {
    return {
        source: {
            // Need to specify light and dark icons to use currentColor fill
            light: `icons/${iconName}.svg`,
            dark: `icons/${iconName}.svg`,
        },
    };
}
