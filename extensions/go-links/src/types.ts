type Link = {
    id: string
    name: string
    url: string
    description: string
}

type LinkForm = Pick<Link, "name" | "description">

export type {Link, LinkForm}
