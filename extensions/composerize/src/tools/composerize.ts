import composerize from "composerize";

type Input = {
  /**
   * The Docker run command to convert to a Docker Compose format
   */
  input: string;
};

/**
 * Convert a Docker run command to a Docker Compose format
 */
export default function tool({ input }: Input) {
  let result: string;
  try {
    result = composerize(input);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to convert Docker run command to Docker Compose format");
  }
  return result;
}
