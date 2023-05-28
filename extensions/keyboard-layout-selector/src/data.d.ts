export interface LayoutType {
  readonly title: string
  readonly id: string
  activate: () => Promise<void>
}

export interface LayoutManagerType {
  getAll: () => Promise<LayoutType[]>
  setSelectedInput: (selectedId: string) => Promise<ILayout>
  activeInput?: string
}