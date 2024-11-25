export function generateGamePageLink(placeId: number) {
  return `https://www.roblox.com/games/${placeId}`;
}

export function generateUserProfileLink(userId: number) {
  return `https://www.roblox.com/users/${userId}/profile`;
}

export function generateGameStartLink(placeId: number) {
  return `roblox://experiences/start?placeId=${placeId}`;
}

export function generateGameStudioLink(placeId: number) {
  // universe id is not needed
  return `roblox-studio:1+launchmode:edit+task:EditPlace+placeId:${placeId}+universeId:00000000`;
}
