import useUserBooksByStatus from "./hooks/useUserBooksByStatus";
import { DID_NOT_FINISH_STATUS } from "./api/books";
import UserBooks from "./components/UserBooks";
import useMe from "./hooks/useMe";

export default function Command() {
  const { me, isMeLoading } = useMe();
  const { userBooks, isUserBooksLoading, mutateUserBooks } = useUserBooksByStatus(DID_NOT_FINISH_STATUS);

  return (
    <UserBooks
      userBooks={userBooks}
      me={me}
      isUserBooksLoading={isUserBooksLoading || isMeLoading}
      mutateUserBooks={mutateUserBooks}
    />
  );
}
