import { Action, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { deleteCertificates, openApp } from "./fixes";
import { RccList } from "./rcc-list";
import { RowActions } from "./resolve";
import {
	byUrgency,
	parseCerts,
	type CertStatus,
	type CertsReport,
} from "./certs-json";

const TINT: Record<CertStatus, Color> = {
	expired: Color.Red,
	expiring: Color.Orange,
	valid: Color.Green,
};

const ICON: Record<CertStatus, Icon> = {
	expired: Icon.XMarkCircle,
	expiring: Icon.Clock,
	valid: Icon.CheckCircle,
};

function Rows({ c, actions }: { c: CertsReport; actions: React.ReactNode }) {
	// Expired first: a certificate that already stopped working is the reason
	// anyone opens this.
	const sorted = useMemo(
		() => [...c.certificates].sort(byUrgency),
		[c.certificates],
	);
	// Only an expired certificate is a thing to remove, and only from the login
	// keychain: the System keychain holds roots other software trusts, and one
	// expired there is not the reader's to remove from a list. A valid or
	// expiring certificate opens Keychain Access instead — the decision to
	// renew or replace is not one keystroke's worth.
	const expired = useMemo(
		() => sorted.filter((cert) => cert.status === "expired"),
		[sorted],
	);
	const clearAll =
		expired.length > 0
			? {
					title: `Remove ${expired.length} Expired Certificates`,
					command: deleteCertificates(
						expired.map((cert) => cert.name),
					),
					detail: "From the login keychain only. The System keychain is left alone.",
					destructive: true,
					count: expired.length,
				}
			: undefined;
	return (
		<>
			{sorted.map((cert, i) => (
				<List.Item
					key={`${cert.name}-${i}`}
					icon={{
						source: ICON[cert.status],
						tintColor: TINT[cert.status],
					}}
					title={cert.name}
					subtitle={cert.issuer}
					keywords={[cert.status, cert.expires]}
					accessories={[
						{ text: cert.expires },
						...(cert.self_signed
							? [{ tag: { value: "self-signed" } }]
							: []),
						{
							tag: {
								value: cert.status,
								color: TINT[cert.status],
							},
						},
					]}
					actions={
						<RowActions
							one={
								cert.status === "expired"
									? {
											title: "Remove This Certificate",
											command: deleteCertificates([
												cert.name,
											]),
											detail: `Expired ${cert.expires}. Removed from the login keychain only.`,
											destructive: true,
										}
									: {
											title: "Open Keychain Access",
											command: openApp("Keychain Access"),
										}
							}
							all={clearAll}
							shared={actions}
						>
							<Action.CopyToClipboard
								title="Copy Certificate Name"
								content={cert.name}
							/>
						</RowActions>
					}
				/>
			))}
		</>
	);
}

export default function Command() {
	return (
		<RccList
			command="certs"
			parse={parseCerts}
			navigationTitle={(c) =>
				c
					? `Certificates — ${c.counts.expired} expired, ${c.counts.expiring} expiring within ${c.expiring_window_days} days`
					: "Certificates"
			}
			searchBarPlaceholder="Search by name, issuer or status"
			emptyIcon={Icon.Lock}
			emptyTitle="No certificates in the keychain"
		>
			{(c, actions) => <Rows c={c} actions={actions} />}
		</RccList>
	);
}
