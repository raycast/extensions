import { LaunchProps, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { IdResolver } from "@atproto/identity";
import { showFailureToast } from "@raycast/utils";

export default async function resolveHandleDid(args: LaunchProps<{ arguments: Arguments.ResolveHandleDid }>) {
	const { identifier } = args.arguments;
	const resolver = new IdResolver();

	if (identifier.startsWith("did:")) {
		try {
			await showToast(Toast.Style.Animated, "Resolving handle");

			const didDoc = await resolver.did.resolve(identifier);
			const handle = didDoc?.alsoKnownAs?.[0]?.replace(/^at:\/\//, "");
			if (!handle) throw "";

			await Clipboard.copy(handle);
			return showHUD("Copied handle to clipboard");
		} catch (e) {
			return showFailureToast("Failed to resolve DID to handle");
		}
	} else if (identifier.includes(".")) {
		const handle = identifier.startsWith("@") ? identifier.slice(1) : identifier;
		try {
			await showToast(Toast.Style.Animated, "Resolving DID");

			const did = await resolver.handle.resolve(handle);
			if (!did) throw "";

			await Clipboard.copy(did);
			return showHUD("Copied DID to clipboard");
		} catch (e) {
			return showFailureToast("Failed to resolve handle to DID");
		}
	} else {
		return showFailureToast("Invalid handle or DID");
	}
}
