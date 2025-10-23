import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getDiagrams, getOrganizations } from "./api/cacoo";
import { ListDiagrams } from "./components/ListDiagrams";

const PER_PAGE = 15;

export default function Command() {
	const [keyword, setKeyword] = useState("");
	const [organizationKey, setOrganizationKey] = useCachedState<string | null>(
		"organization-id",
		null,
	);

	const { isLoading: isLoadingOrganizations, data: organizations } =
		useCachedPromise(
			async () => {
				const { result } = await getOrganizations();

				if (!organizationKey) {
					setOrganizationKey(result[0]?.key || null);
				}

				return result;
			},
			[],
			{
				initialData: [],
			},
		);

	const {
		isLoading: isLoadingDiagrams,
		data: diagrams = [],
		pagination,
	} = usePromise(
		(organizationKey: string | null, keyword: string) =>
			async (options: { page: number }) => {
				if (!organizationKey) return { data: [], hasMore: false };

				const { result, count } = await getDiagrams({
					organizationKey,
					keyword,
					limit: PER_PAGE,
					offset: options.page * PER_PAGE,
				});

				return { data: result, hasMore: count > (options.page + 1) * PER_PAGE };
			},
		[organizationKey, keyword],
	);

	return (
		<ListDiagrams
			organizations={organizations}
			diagrams={diagrams}
			isLoading={isLoadingOrganizations || isLoadingDiagrams}
			pagination={pagination}
			organizationKey={organizationKey}
			keyword={keyword}
			onChangeOrganizationKey={setOrganizationKey}
			onChangeKeyword={setKeyword}
		/>
	);
}
