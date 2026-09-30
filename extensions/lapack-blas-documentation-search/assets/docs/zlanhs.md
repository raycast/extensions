```fortran
double precision function zlanhs (
        character norm,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) work
)
```

ZLANHS  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
Hessenberg matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in ZLANHS as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, ZLANHS is
> set to zero.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> The n by n upper Hessenberg matrix A; the part of A below the
> first sub-diagonal is not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(N,1).

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I'; otherwise, WORK is not
> referenced.
