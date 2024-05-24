import { ActionPanel, Action, Grid, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { transformData, fetchData } from "./api";
import { auth, db } from "./firebase";
import { getWeekDocId } from "./helpers";
import { signInAnonymously } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import OrderDetails from "./orderdetails";
import ItemDetails from "./details";

const pageSize = 25;

export default function Command() {

  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const { isLoading, data, pagination } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      const data = await fetchData(searchText, options.page, pageSize)
      return transformData(data, searchText, pageSize, pageSize)
    },
    [searchText],
  );

  useEffect(() => {
    signInAnonymously(auth)
    .then(() => {
      setIsSignedIn(true)
      console.log("Signed in")
    })
    .catch((error) => {
      setIsSignedIn(false)
      console.log(error.message)
    });
  }, []);

  useEffect(() => {
    console.log(`Looking for ${getWeekDocId()}`)
    const docRef = doc(db, getWeekDocId());

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        //console.log(`Got data: ${snapshot.data().items.length}`)
        setOrderData(snapshot.data().items || []);
        setLoading(false);
      },
      (err) => {
        setError(err);
        console.log(`Got error: ${err}`)
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSignedIn]);
  
  return (
    <Grid isLoading={isLoading} onSearchTextChange={setSearchText} pagination={pagination} throttle>
      {data?.map((item) => (
        <Grid.Item
          key={item.id}
          content={{ source: `https://bilder.ngdata.no/${item.imagePath}/small.jpg` }}
          title={orderData.some(order => order.id === item.id && order.count > 0)  ? `✅ ${item.title} (${orderData.find(order => order.id === item.id).count || 0})` : item.title }
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action title="Gå til vare" onAction={() => push(<ItemDetails item={item} orderData={orderData} />)} />
              <Action title="Vis bestilling" onAction={() => push(<OrderDetails item={item} orderData={orderData} />)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

