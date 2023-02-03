import { Detail, Cache } from "@raycast/api";

export default function Component() {
	const pinboardCache = new Cache({
    namespace: "pinboard",
  });
	// empty the cache
	pinboardCache.clear();
	return <Detail markdown="Cache cleared" />;
}