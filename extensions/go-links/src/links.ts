import crypto from "node:crypto"

import type {Link} from "~/types"

const createGoUrl = (name: Link["name"]) => {
    return `http://go/${name}`
}

const createLink = (
    links: Link[],
    name: Link["name"],
    description: Link["description"],
) => {
    const link: Link = {
        id: crypto.randomUUID(),
        name,
        url: createGoUrl(name),
        description,
    }

    const newLinks = [...links, link].sort((a, b) =>
        a.name.localeCompare(b.name),
    )

    return newLinks
}

const deleteLink = (links: Link[], id: Link["id"]) => {
    const newLinks = links
        .filter(link => link.id !== id)
        .sort((a, b) => a.name.localeCompare(b.name))

    return newLinks
}

export {createGoUrl, createLink, deleteLink}
