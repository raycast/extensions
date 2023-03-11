export const getChangeLogUrl = (type: 'github' | 'gitlab' | undefined, owner: string | null, name: string | null ) => {
  if(type === 'github' && owner && name) {
    return `https://github.com/${owner}/${name}/releases`;
  }
  return null;
}
