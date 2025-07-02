type ReleaseEntry = {
  id: number;
  projectID: string;
  releaseID: number;
  type: "addition" | "improvement" | "bug-fix";
  entryType: "Addition" | "Improvement" | "Bug Fix";
  description: string;
};

export default ReleaseEntry;
