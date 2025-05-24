import useUserBooksByStatus from "./hooks/useUserBooksByStatus";
import { READ_STATUS } from "./api/books";
import UserBooks from "./components/UserBooks";
import useMe from "./hooks/useMe";

export default function Command() {
  const { me, isMeLoading } = useMe();
  const { userBooks, isUserBooksLoading, mutateUserBooks } = useUserBooksByStatus(READ_STATUS);

  return (
    <UserBooks
      userBooks={userBooks}
      me={me}
      isUserBooksLoading={isUserBooksLoading || isMeLoading}
      mutateUserBooks={mutateUserBooks}
    />
  );
}
