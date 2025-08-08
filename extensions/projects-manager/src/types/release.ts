type Release = {
  id: number;
  projectID: string;
  releaseType: "major" | "minor" | "patch";
  date: string;
  released: boolean;
  version: string;
};

export default Release;
