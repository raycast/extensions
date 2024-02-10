import usePerplexity from "./api/perplexity";

export default function taskBreakdown(props) {
  return usePerplexity(props, {
    context: "Turn the following project title or description in the section 'Task' into a list of todos.",
    allowPaste: true,
  });
}
