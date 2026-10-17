```fortran
subroutine claqhp (
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        real, dimension( * ) s,
        real scond,
        real amax,
        character equed
)
```

CLAQHP equilibrates a Hermitian matrix A using the scaling factors
in the vector S.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> Hermitian matrix A is stored.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the Hermitian matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, the equilibrated matrix:  diag(S) \* A \* diag(S), in
> the same storage format as A.

S : REAL array, dimension (N) [in]
> The scale factors for A.

SCOND : REAL [in]
> Ratio of the smallest S(i) to the largest S(i).

AMAX : REAL [in]
> Absolute value of largest matrix entry.

EQUED : CHARACTER\*1 [out]
> Specifies whether or not equilibration was done.
> = 'N':  No equilibration.
> = 'Y':  Equilibration was done, i.e., A has been replaced by
> diag(S) \* A \* diag(S).
