import { Detail } from "@raycast/api";
import { useErrorToast } from "../hooks/use-error-toast";

export function ErrorDetail() {
  useErrorToast(new Error());
  return (
    <Detail
      markdown={`# Oops! We're Out of Tune! 🎵⚠️

Uh oh, it looks like we've hit a bit of a musical mishap!

While we usually do a great job helping you navigate the world of music, it looks like your last request slipped through the gaps of our groovy record collection. 

Maybe your query plunged into unexplored melody depths, or took a detour to rhythm-ville where we haven’t chartered yet. Whatever the reason, no fret! We’re continuously expanding our repertoire.

Meanwhile, why not explore [Sona Stream](https://app.sona.stream) 🎧? New grooves, melodious tracks, and rhythmic journeys await you there.

Remember, a hiccup in rhythm can lead to a beautiful tune. Stay tuned and keep the beats going! `}
    />
  );
}
