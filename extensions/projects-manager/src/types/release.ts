type Release = {
  id: number;
  projectID: string;
  releaseType: "major" | "minor" | "patch";
  date: string;
  released: boolean;
};

export default Release;
