type Resource = {
	name: string
	description: string
	url: string
	section: "featured" | "library" | "blocks" | "design"
}

export const resources = (): Resource[] => {
	return [
		{
			name: "uipub",
			description: "Perfect tools to build next-gen UI",
			url: "https://uipub.com/",
			section: "featured"
		},
		{
			name: "shadcnblocks",
			description: "The ultimate block set for Shadcn UI & Tailwind",
			url: "https://www.shadcnblocks.com/",
			section: "blocks"
		},
		{
			name: "shadcndesign",
			description: "shadcn/ui for Figma",
			url: "https://www.shadcndesign.com/",
			section: "design"
		},
		{
			name: "shadcn/ui - Design System",
			description: "Beautifully designed components built with Radix UI and Tailwind CSS.",
			url: "https://www.figma.com/community/file/1203061493325953101",
			section: "design"
		}
	]
}