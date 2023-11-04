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
  } else if (
    item.metadata.external_system_identifiers &&
    item.metadata.external_system_identifiers.some((obj: any) => obj.schema === "KEKSCAN")
  ) {
    const kekValue: string = item.metadata.external_system_identifiers.find(
      (obj: any) => obj.schema === "KEKSCAN"
    ).value;
    const parts: string[] = kekValue.split("-");
    const urlComponent: string =
      (parts[0].length === 4 ? parts[0] : "19" + parts[0]) +
      "/" +
      parts[0].slice(-2) +
      parts[1] +
      "/" +
      parts[0].slice(-2) +
      parts[1] +
      parts[2] +
      ".pdf";
    return `https://lib-extopc.kek.jp/preprints/PDF/${urlComponent}`;
  } else if (item.metadata.dois) {
    return `https://doi.org/${item.metadata.dois[0].value}`;
  } else {
    return `https://inspirehep.net/literature/${item.id}`;
  }
}
