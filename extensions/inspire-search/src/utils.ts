export function abbreviateNames(names: Array<{ full_name: string }>) {
  return names
    .map(({ full_name }) => {
      const [last, first = ""] = full_name.split(", ");
      const abbreviatedFirst = first ? `${first.charAt(0)}. ` : "";
      return `${abbreviatedFirst}${last}`;
    })
    .join(", ");
}

export function displayCollaborations(collaborations: Array<{ value: string }>) {
  return collaborations.map((obj) => obj.value).join(", ");
}

export function selectUrl(item: any) {
  if (item.metadata.arxiv_eprints) {
    return `https://arxiv.org/pdf/${item.metadata.arxiv_eprints[0].value}`;
  } else if (item.metadata.dois) {
    return `https://doi.org/${item.metadata.dois[0].value}`;
  } else {
    return `https://inspirehep.net/literature/${item.id}`;
  }
}
