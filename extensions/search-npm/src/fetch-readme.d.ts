declare module 'fetch-readme' {
  const fetchReadme: (user: string, name: string) => Promise<string>
  export { fetchReadme }
}
