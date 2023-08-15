import { CreateDatabaseForm } from "./components";
import { View } from "./components";

function CreateDatabasePage() {
  return <CreateDatabaseForm />;
}

export default function Command() {
  return (
    <View>
      <CreateDatabasePage />
    </View>
  );
}
