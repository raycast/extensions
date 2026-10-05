```fortran
subroutine zgbbrd (
        character vect,
        integer m,
        integer n,
        integer ncc,
        integer kl,
        integer ku,
        complex*16, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        complex*16, dimension( ldq, * ) q,
        integer ldq,
        complex*16, dimension( ldpt, * ) pt,
        integer ldpt,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZGBBRD reduces a complex general m-by-n band matrix A to real upper
bidiagonal form B by a unitary transformation: Q\*\*H \* A \* P = B.

The routine computes B, and optionally forms Q or P\*\*H, or computes
Q\*\*H\*C for a given matrix C.

## Parameters
VECT : CHARACTER\*1 [in]
> Specifies whether or not the matrices Q and P\*\*H are to be
> formed.
> = 'N': do not form Q or P\*\*H;
> = 'Q': form Q only;
> = 'P': form P\*\*H only;
> = 'B': form both.

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

NCC : INTEGER [in]
> The number of columns of the matrix C.  NCC >= 0.

KL : INTEGER [in]
> The number of subdiagonals of the matrix A. KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals of the matrix A. KU >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in,out]
> On entry, the m-by-n band matrix A, stored in rows 1 to
> KL+KU+1. The j-th column of A is stored in the j-th column of
> the array AB as follows:
> AB(ku+1+i-j,j) = A(i,j) for max(1,j-ku)<=i<=min(m,j+kl).
> On exit, A is overwritten by values generated during the
> reduction.

LDAB : INTEGER [in]
> The leading dimension of the array A. LDAB >= KL+KU+1.

D : DOUBLE PRECISION array, dimension (min(M,N)) [out]
> The diagonal elements of the bidiagonal matrix B.

E : DOUBLE PRECISION array, dimension (min(M,N)-1) [out]
> The superdiagonal elements of the bidiagonal matrix B.

Q : COMPLEX\*16 array, dimension (LDQ,M) [out]
> If VECT = 'Q' or 'B', the m-by-m unitary matrix Q.
> If VECT = 'N' or 'P', the array Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.
> LDQ >= max(1,M) if VECT = 'Q' or 'B'; LDQ >= 1 otherwise.

PT : COMPLEX\*16 array, dimension (LDPT,N) [out]
> If VECT = 'P' or 'B', the n-by-n unitary matrix P'.
> If VECT = 'N' or 'Q', the array PT is not referenced.

LDPT : INTEGER [in]
> The leading dimension of the array PT.
> LDPT >= max(1,N) if VECT = 'P' or 'B'; LDPT >= 1 otherwise.

C : COMPLEX\*16 array, dimension (LDC,NCC) [in,out]
> On entry, an m-by-ncc matrix C.
> On exit, C is overwritten by Q\*\*H\*C.
> C is not referenced if NCC = 0.

LDC : INTEGER [in]
> The leading dimension of the array C.
> LDC >= max(1,M) if NCC > 0; LDC >= 1 if NCC = 0.

WORK : COMPLEX\*16 array, dimension (max(M,N)) [out]

RWORK : DOUBLE PRECISION array, dimension (max(M,N)) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
