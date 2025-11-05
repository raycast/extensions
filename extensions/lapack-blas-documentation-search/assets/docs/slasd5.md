```fortran
subroutine slasd5 (
        integer i,
        real, dimension( 2 ) d,
        real, dimension( 2 ) z,
        real, dimension( 2 ) delta,
        real rho,
        real dsigma,
        real, dimension( 2 ) work
)
```

This subroutine computes the square root of the I-th eigenvalue
of a positive symmetric rank-one modification of a 2-by-2 diagonal
matrix

diag( D ) \* diag( D ) +  RHO \* Z \* transpose(Z) .

The diagonal entries in the array D are assumed to satisfy

0 <= D(i) < D(j)  for  i < j .

We also assume RHO > 0 and that the Euclidean norm of the vector
Z is one.

## Parameters
I : INTEGER [in]
> The index of the eigenvalue to be computed.  I = 1 or I = 2.

D : REAL array, dimension (2) [in]
> The original eigenvalues.  We assume 0 <= D(1) < D(2).

Z : REAL array, dimension (2) [in]
> The components of the updating vector.

DELTA : REAL array, dimension (2) [out]
> Contains (D(j) - sigma_I) in its  j-th component.
> The vector DELTA contains the information necessary
> to construct the eigenvectors.

RHO : REAL [in]
> The scalar in the symmetric updating formula.

DSIGMA : REAL [out]
> The computed sigma_I, the I-th updated eigenvalue.

WORK : REAL array, dimension (2) [out]
> WORK contains (D(j) + sigma_I) in its  j-th component.
