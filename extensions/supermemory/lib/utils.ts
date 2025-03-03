export function createSpaceMessage(spaceNames: string[]) {
  switch (spaceNames.length) {
    case 0:
      return "Added to Supermemory!";
    case 1:
      return `Added to space "${spaceNames[0]}"!`;
    case 2:
      return `Added to spaces "${spaceNames[0]}" and "${spaceNames[1]}"!`;
    default:
      return `Added to spaces "${spaceNames.slice(0, -1).join('", "')}" and "${spaceNames[spaceNames.length - 1]}"!`;
  }
}
