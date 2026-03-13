```fortran
subroutine slaed4 (
        integer n,
        integer i,
        real, dimension( * ) d,
        real, dimension( * ) z,
        real, dimension( * ) delta,
        real rho,
        real dlam,
        integer info
)
```

This subroutine computes the I-th updated eigenvalue of a symmetric
rank-one modification to a diagonal matrix whose elements are
given in the array d, and that

D(i) < D(j)  for  i < j

and that RHO > 0.  This is arranged by the calling routine, and is
no loss in generality.  The rank-one modified system is thus

diag( D )  +  RHO \* Z \* Z_transpose.

where we assume the Euclidean norm of Z is 1.

The method consists of approximating the rational functions in the
secular equation by simpler interpolating rational functions.

## Parameters
N : INTEGER [in]
> The length of all arrays.

I : INTEGER [in]
> The index of the eigenvalue to be computed.  1 <= I <= N.

D : REAL array, dimension (N) [in]
> The original eigenvalues.  It is assumed that they are in
> order, D(I) < D(J)  for I < J.

Z : REAL array, dimension (N) [in]
> The components of the updating vector.

DELTA : REAL array, dimension (N) [out]
> If N > 2, DELTA contains (D(j) - lambda_I) in its  j-th
> component.  If N = 1, then DELTA(1) = 1. If N = 2, see SLAED5
> for detail. The vector DELTA contains the information necessary
> to construct the eigenvectors by SLAED3 and SLAED9.

RHO : REAL [in]
> The scalar in the symmetric updating formula.

DLAM : REAL [out]
> The computed lambda_I, the I-th updated eigenvalue.

INFO : INTEGER [out]
> = 0:  successful exit
> > 0:  if INFO = 1, the updating process failed.
