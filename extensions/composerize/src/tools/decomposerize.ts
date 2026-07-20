import decomposerize from "decomposerize";

type Input = {
  /**
   * The Docker Compose format to convert to a Docker run command
   */
  input: string;
};

/**
 * Convert a Docker Compose format to a Docker run command
 */
export default function tool({ input }: Input) {
  let result: string;
  try {
    result = decomposerize(input);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to convert Docker Compose format to Docker run command");
  }
  return result;
}
