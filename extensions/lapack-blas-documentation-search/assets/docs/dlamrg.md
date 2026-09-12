```fortran
subroutine dlamrg (
        integer n1,
        integer n2,
        double precision, dimension( * ) a,
        integer dtrd1,
        integer dtrd2,
        integer, dimension( * ) index
)
```

DLAMRG will create a permutation list which will merge the elements
of A (which is composed of two independently sorted sets) into a
single set which is sorted in ascending order.

## Parameters
N1 : INTEGER [in]

N2 : INTEGER [in]
> These arguments contain the respective lengths of the two
> sorted lists to be merged.

A : DOUBLE PRECISION array, dimension (N1+N2) [in]
> The first N1 elements of A contain a list of numbers which
> are sorted in either ascending or descending order.  Likewise
> for the final N2 elements.

DTRD1 : INTEGER [in]

DTRD2 : INTEGER [in]
> These are the strides to be taken through the array A.
> Allowable strides are 1 and -1.  They indicate whether a
> subset of A is sorted in ascending (DTRDx = 1) or descending
> (DTRDx = -1) order.

INDEX : INTEGER array, dimension (N1+N2) [out]
> On exit this array will contain a permutation such that
> if B( I ) = A( INDEX( I ) ) for I=1,N1+N2, then B will be
> sorted in ascending order.
