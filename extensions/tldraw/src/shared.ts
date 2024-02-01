export interface ProjectValues {
  description?: string;
  url: string;
}

export interface ProjectDetails {
  name: string;
  description?: string;
}

export const projectURL = (id: string) => `https://www.tldraw.com/r/aycast_${id}`;
