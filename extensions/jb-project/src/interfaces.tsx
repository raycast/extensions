export type Project = {
	id: string
	path: string
	name: string
	icon?:string;
	duplication?:boolean
	timestamp: number
	opened:boolean
}
export type Product = {
	key: string
	project: Project[]
	command: string
	productName: string
	displayName: string
	score: number
}
export type RecentProduct = {
	project: Project
	command: string
	productName: string
	displayName: string
	timestamp: number
	score: number
}
export type Paths = {
	basePath: string
	middlePath: string
	fileName: string
}
export type Config = {
	supportProduct: SupportProduct[]
	installProdNames:string[]
	configPath: Paths
}

export type SupportProduct = {
	appName:string
	productName: string
	command: string
}
export type InstallProduct = {
	productName: string
	score:number
}

export type Data = {
	recentProducts: RecentProduct[]
	products: Product[]
}

