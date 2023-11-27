import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { listBranches } from "../githubApi";
import { GithubBranchDetails } from "../githubTypes";

// export interface SelectBranchProps {
//   selectedApp: string
// }

export const SelectBranch = () => {

  const [loading, setLoading] = useState<boolean>(true);
  const [branches, setBranches] = useState<GithubBranchDetails[]>();

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const devices = await listBranches();
        setLoading(false)
        setBranches(devices)
        // await showToast({
        //   style: Toast.Style.Animated,
        //   title: `Select branch`,
        // });
      } catch (error) {
        setLoading(false)
        console.log(error);
      }
    }
    fetchData()
  }, [])

  return (
    <List navigationTitle="Select branch" isLoading={loading} >
      {
        branches?.map((b) => {
          return <List.Item title={b.name} />
        })
      }
    </List>
  )
}