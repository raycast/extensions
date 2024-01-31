export const getChangeLogUrl = (
  type: 'github' | 'gitlab' | undefined,
  owner: string | null | undefined,
  name: string | null | undefined,
) => {
  if (type === 'github' && owner && name) {
    return `https://github.com/${owner}/${name}/releases`
  }
  return null
}
