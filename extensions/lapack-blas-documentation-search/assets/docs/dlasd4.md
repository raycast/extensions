```fortran
subroutine dlasd4 (
        integer n,
        integer i,
        double precision, dimension( * ) d,
        double precision, dimension( * ) z,
        double precision, dimension( * ) delta,
        double precision rho,
        double precision sigma,
        double precision, dimension( * ) work,
        integer info
)
```

This subroutine computes the square root of the I-th updated
eigenvalue of a positive symmetric rank-one modification to
a positive diagonal matrix whose entries are given as the squares
of the corresponding entries in the array d, and that

0 <= D(i) < D(j)  for  i < j

and that RHO > 0. This is arranged by the calling routine, and is
no loss in generality.  The rank-one modified system is thus

diag( D ) \* diag( D ) +  RHO \* Z \* Z_transpose.

where we assume the Euclidean norm of Z is 1.

The method consists of approximating the rational functions in the
secular equation by simpler interpolating rational functions.

## Parameters
N : INTEGER [in]
> The length of all arrays.

I : INTEGER [in]
> The index of the eigenvalue to be computed.  1 <= I <= N.

D : DOUBLE PRECISION array, dimension ( N ) [in]
> The original eigenvalues.  It is assumed that they are in
> order, 0 <= D(I) < D(J)  for I < J.

Z : DOUBLE PRECISION array, dimension ( N ) [in]
> The components of the updating vector.

DELTA : DOUBLE PRECISION array, dimension ( N ) [out]
> If N .ne. 1, DELTA contains (D(j) - sigma_I) in its  j-th
> component.  If N = 1, then DELTA(1) = 1.  The vector DELTA
> contains the information necessary to construct the
> (singular) eigenvectors.

RHO : DOUBLE PRECISION [in]
> The scalar in the symmetric updating formula.

SIGMA : DOUBLE PRECISION [out]
> The computed sigma_I, the I-th updated eigenvalue.

WORK : DOUBLE PRECISION array, dimension ( N ) [out]
> If N .ne. 1, WORK contains (D(j) + sigma_I) in its  j-th
> component.  If N = 1, then WORK( 1 ) = 1.

INFO : INTEGER [out]
> = 0:  successful exit
> > 0:  if INFO = 1, the updating process failed.
