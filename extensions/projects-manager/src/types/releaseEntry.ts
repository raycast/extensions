type ReleaseEntry = {
  id: number;
  projectID: string;
  releaseID: number;
  type: "addition" | "improvement" | "bug-fix";
  description: string;
};

export default ReleaseEntry;
