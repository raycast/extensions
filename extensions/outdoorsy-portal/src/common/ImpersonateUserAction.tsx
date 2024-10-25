import { Action, Icon, Image } from "@raycast/api";
import { impersonateUser } from "../utils/browser";
import { useCallback } from "react";

interface IImpersonateUserActionProps {
  id: number;
  adminToken: string;
  url?: string;
  title?: string;
  icon?: Image.ImageLike;
}

export default function ImpersonateUserAction(props: IImpersonateUserActionProps) {
  const { id, adminToken, url, title, icon } = props;

  const impersonate = useCallback(async () => {
    await impersonateUser(id, adminToken, url)
  }, [id, adminToken, url])

  return (
    <Action title={title || 'Impersonate User'} icon={icon || Icon.Person} onAction={impersonate} />
  )
}
