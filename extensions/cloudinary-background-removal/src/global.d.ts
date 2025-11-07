// Global type declarations for Raycast extension
// fetch is available in Node.js 18+ and Raycast's runtime

declare global {
  function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>
}

export {}
