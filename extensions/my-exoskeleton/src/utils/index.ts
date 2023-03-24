export const getBearerTokenHeader = (token: string) => ({ Authorization: `Bearer ${token}` })
