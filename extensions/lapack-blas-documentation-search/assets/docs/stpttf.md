```fortran
subroutine stpttf (
        character transr,
        character uplo,
        integer n,
        real, dimension( 0: * ) ap,
        real, dimension( 0: * ) arf,
        integer info
)
```

STPTTF copies a triangular matrix A from standard packed format (TP)
to rectangular full packed format (TF).

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  ARF in Normal format is wanted;
> = 'T':  ARF in Conjugate-transpose format is wanted.

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : REAL array, dimension ( N\*(N+1)/2 ), [in]
> On entry, the upper or lower triangular matrix A, packed
> columnwise in a linear array. The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.

ARF : REAL array, dimension ( N\*(N+1)/2 ), [out]
> On exit, the upper or lower triangular matrix A stored in
> RFP format. For a further discussion see Notes below.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
