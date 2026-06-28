```fortran
real function clantp (
        character norm,
        character uplo,
        character diag,
        integer n,
        complex, dimension( * ) ap,
        real, dimension( * ) work
)
```

CLANTP  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
triangular matrix A, supplied in packed form.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in CLANTP as described
> above.

UPLO : CHARACTER\*1 [in]
> Specifies whether the matrix A is upper or lower triangular.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

DIAG : CHARACTER\*1 [in]
> Specifies whether or not the matrix A is unit triangular.
> = 'N':  Non-unit triangular
> = 'U':  Unit triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, CLANTP is
> set to zero.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangular matrix A, packed columnwise in
> a linear array.  The j-th column of A is stored in the array
> AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> Note that when DIAG = 'U', the elements of the array AP
> corresponding to the diagonal elements of the matrix A are
> not referenced, but are assumed to be one.

WORK : REAL array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I'; otherwise, WORK is not
> referenced.
